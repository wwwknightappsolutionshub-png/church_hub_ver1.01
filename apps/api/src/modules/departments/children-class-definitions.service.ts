import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { DEFAULT_CHILDREN_CLASS_GROUPS } from './children.constants';

export type ChildrenClassDefinitionRow = {
  id: string;
  churchId: string;
  serviceUnitId: string;
  code: string;
  name: string;
  minAge: number | null;
  maxAge: number | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
};

function slugifyClassCode(name: string): string {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
  return slug || 'CLASS';
}

function agesLabel(minAge: number | null, maxAge: number | null): string {
  if (minAge != null && maxAge != null) return `${minAge}-${maxAge}`;
  if (minAge != null) return `${minAge}+`;
  if (maxAge != null) return `≤${maxAge}`;
  return '';
}

@Injectable()
export class ChildrenClassDefinitionsService {
  constructor(private readonly prisma: PrismaService) {}

  toDto(row: ChildrenClassDefinitionRow) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      minAge: row.minAge,
      maxAge: row.maxAge,
      ages: agesLabel(row.minAge, row.maxAge),
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      isSystem: row.isSystem,
    };
  }

  async ensureDefaults(churchId: string, serviceUnitId: string) {
    const existing = await this.prisma.deptChildrenClassDefinition.count({
      where: { serviceUnitId },
    });
    if (existing > 0) return;

    await this.prisma.deptChildrenClassDefinition.createMany({
      data: DEFAULT_CHILDREN_CLASS_GROUPS.map((g, index) => ({
        churchId,
        serviceUnitId,
        code: g.code,
        name: g.label,
        minAge: g.minAge,
        maxAge: g.maxAge,
        sortOrder: index + 1,
        isSystem: true,
      })),
    });
  }

  async listActive(churchId: string, serviceUnitId: string) {
    await this.ensureDefaults(churchId, serviceUnitId);
    const rows = await this.prisma.deptChildrenClassDefinition.findMany({
      where: { churchId, serviceUnitId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((r) => this.toDto(r));
  }

  async listAll(churchId: string, serviceUnitId: string) {
    await this.ensureDefaults(churchId, serviceUnitId);
    const rows = await this.prisma.deptChildrenClassDefinition.findMany({
      where: { churchId, serviceUnitId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((r) => this.toDto(r));
  }

  labelForCode(
    code: string | null | undefined,
    definitions: Array<{ code: string; name: string }>,
  ): string | null {
    if (!code) return null;
    return definitions.find((d) => d.code === code)?.name ?? code;
  }

  async resolveLabel(churchId: string, serviceUnitId: string, code: string | null | undefined) {
    if (!code) return null;
    const row = await this.prisma.deptChildrenClassDefinition.findFirst({
      where: { churchId, serviceUnitId, code },
      select: { name: true },
    });
    return row?.name ?? code;
  }

  async assertActiveClassCode(churchId: string, serviceUnitId: string, code: string) {
    await this.ensureDefaults(churchId, serviceUnitId);
    const row = await this.prisma.deptChildrenClassDefinition.findFirst({
      where: { churchId, serviceUnitId, code, isActive: true },
    });
    if (!row) {
      throw new BadRequestException(`Unknown or inactive class: ${code}`);
    }
    return row;
  }

  suggestedClassCode(
    dateOfBirth: Date | null | undefined,
    definitions: Array<{ code: string; minAge: number | null; maxAge: number | null }>,
  ): string | null {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    const now = new Date();
    let age = now.getUTCFullYear() - dob.getUTCFullYear();
    const md = now.getUTCMonth() - dob.getUTCMonth();
    if (md < 0 || (md === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;

    for (const def of definitions) {
      const min = def.minAge ?? 0;
      const max = def.maxAge ?? 99;
      if (age >= min && age <= max) return def.code;
    }
    return null;
  }

  async createClass(
    churchId: string,
    serviceUnitId: string,
    body: { name: string; minAge?: number | null; maxAge?: number | null; sortOrder?: number },
  ) {
    if (!body.name?.trim()) throw new BadRequestException('Class name is required');
    await this.ensureDefaults(churchId, serviceUnitId);

    let code = slugifyClassCode(body.name);
    let suffix = 1;
    while (
      await this.prisma.deptChildrenClassDefinition.findFirst({
        where: { serviceUnitId, code },
      })
    ) {
      suffix += 1;
      code = `${slugifyClassCode(body.name)}_${suffix}`;
    }

    const maxSort = await this.prisma.deptChildrenClassDefinition.aggregate({
      where: { serviceUnitId },
      _max: { sortOrder: true },
    });

    const row = await this.prisma.deptChildrenClassDefinition.create({
      data: {
        churchId,
        serviceUnitId,
        code,
        name: body.name.trim(),
        minAge: body.minAge ?? null,
        maxAge: body.maxAge ?? null,
        sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
        isSystem: false,
      },
    });
    return this.toDto(row);
  }

  async updateClass(
    churchId: string,
    serviceUnitId: string,
    classId: string,
    body: {
      name?: string;
      minAge?: number | null;
      maxAge?: number | null;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    const row = await this.prisma.deptChildrenClassDefinition.findFirst({
      where: { id: classId, churchId, serviceUnitId },
    });
    if (!row) throw new NotFoundException('Class not found');

    const updated = await this.prisma.deptChildrenClassDefinition.update({
      where: { id: classId },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.minAge !== undefined ? { minAge: body.minAge } : {}),
        ...(body.maxAge !== undefined ? { maxAge: body.maxAge } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
    return this.toDto(updated);
  }
}

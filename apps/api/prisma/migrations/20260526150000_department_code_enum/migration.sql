-- DepartmentCode enum (required before dept_feature_modules; MEDICAL added in that migration)

CREATE TYPE "DepartmentCode" AS ENUM (
  'USHERING',
  'CHOIR',
  'EVANGELISM',
  'YOUTH',
  'TEENS',
  'CHILDREN',
  'PROTOCOL',
  'PRAYER',
  'MEDIA',
  'OTHER'
);

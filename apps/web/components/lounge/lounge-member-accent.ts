/** Stable accent per member — visual variety without showing names. */
export function loungeMemberAccent(memberId: string, isSelf: boolean) {
  if (isSelf) {
    return {
      head: '#fde68a',
      body: '#d97706',
      limb: '#92400e',
      stroke: '#fbbf24',
      shirt: '#f59e0b',
    };
  }
  let h = 0;
  for (let i = 0; i < memberId.length; i++) h = (h * 31 + memberId.charCodeAt(i)) | 0;
  const hue = 200 + (Math.abs(h) % 70);
  return {
    head: `hsl(${hue} 35% 88%)`,
    body: `hsl(${hue} 42% 38%)`,
    limb: `hsl(${hue} 38% 32%)`,
    stroke: `hsl(${hue} 50% 72%)`,
    shirt: `hsl(${hue} 40% 48%)`,
  };
}

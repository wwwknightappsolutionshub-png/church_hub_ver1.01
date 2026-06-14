/** Human-readable labels for address form fields (DB keys unchanged). */
export function addressFieldLabel(key: string): string {
  const labels: Record<string, string> = {
    address: 'Address 1',
    address2: 'Address 2',
    city: 'City',
    state: 'State',
    zip: 'Post Code',
    country: 'Country',
  };
  return labels[key] ?? key;
}

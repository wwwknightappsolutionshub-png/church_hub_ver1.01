import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function checkApiReachable(): Promise<boolean> {
  try {
    await axios.get(`${API_URL}/api/v1/health`, { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

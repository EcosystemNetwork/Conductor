import { createThirdwebClient } from 'thirdweb';

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
if (!clientId) {
  throw new Error('NEXT_PUBLIC_THIRDWEB_CLIENT_ID environment variable is not set');
}

export const thirdwebClient = createThirdwebClient({ clientId });

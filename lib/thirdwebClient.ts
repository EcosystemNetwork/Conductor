import { createThirdwebClient, ThirdwebClient } from 'thirdweb';

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

export const thirdwebClient: ThirdwebClient | null = clientId
  ? createThirdwebClient({ clientId })
  : null;

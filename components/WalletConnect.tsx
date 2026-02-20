import { ConnectButton } from 'thirdweb/react';
import { thirdwebClient } from '../lib/thirdwebClient';

export default function WalletConnect() {
  if (!thirdwebClient) return null;
  return <ConnectButton client={thirdwebClient} />;
}

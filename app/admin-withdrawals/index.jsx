import React from 'react';
import InfoPage from '../../src/shared/screens/InfoPage';

export default function AdminWithdrawalsPage() {
  return (
    <InfoPage
      title="Admin Withdrawals"
      subtitle="Payment and payout review."
      sections={[
        { title: 'Website feature', text: 'The web app includes withdrawal and payment review screens for admins.' },
        { title: 'Mobile status', text: 'This route keeps the stack aligned until the native admin workflow is ported.' },
      ]}
    />
  );
}


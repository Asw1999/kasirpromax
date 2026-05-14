import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

export function useTransactions(from?: Date, to?: Date) {
  return useLiveQuery(
    async () => {
      if (from && to) {
        return db.transactions
          .where('date')
          .between(from.toISOString(), to.toISOString(), true, true)
          .reverse()
          .toArray();
      }
      return db.transactions.orderBy('date').reverse().limit(100).toArray();
    },
    [from?.toISOString(), to?.toISOString()]
  );
}

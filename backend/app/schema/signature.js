import * as Zod from 'zod';

export const SendForSignatureSchema = Zod.object({
  officerId: Zod.string(),
});
import {
  doublePrecision,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const accessPoints = pgTable('puntos_acceso', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombrePunto: text('nombre_punto').notNull(),
  latitud: doublePrecision('latitud').notNull(),
  longitud: doublePrecision('longitud').notNull(),
  edificio: text('edificio').notNull(),
  calleAcceso: text('calle_acceso').notNull(),
  tipoEntrada: text('tipo_entrada').notNull(),
  createdByUid: text('created_by_uid'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type UserRecord = typeof users.$inferSelect;
export type AccessPointRecord = typeof accessPoints.$inferSelect;
export type NewAccessPointRecord = typeof accessPoints.$inferInsert;

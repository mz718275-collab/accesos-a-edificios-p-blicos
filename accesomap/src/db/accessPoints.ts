import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { accessPoints, type AccessPointRecord } from './schema.ts';
import type { TipoEntrada, ValidatedAccessPointInput } from '../lib/validation.ts';

export async function listAccessPoints(
  tipoEntrada?: TipoEntrada,
): Promise<AccessPointRecord[]> {
  try {
    if (tipoEntrada) {
      return await db
        .select()
        .from(accessPoints)
        .where(eq(accessPoints.tipoEntrada, tipoEntrada))
        .orderBy(desc(accessPoints.createdAt));
    }

    return await db
      .select()
      .from(accessPoints)
      .orderBy(desc(accessPoints.createdAt));
  } catch (error) {
    console.error('Database query failed in listAccessPoints:', error);
    throw new Error('No se pudieron consultar los puntos de acceso.', {
      cause: error,
    });
  }
}

export async function getAccessPointById(
  id: string,
): Promise<AccessPointRecord | null> {
  try {
    const rows = await db
      .select()
      .from(accessPoints)
      .where(eq(accessPoints.id, id))
      .limit(1);

    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getAccessPointById:', error);
    throw new Error('No se pudo consultar el punto de acceso solicitado.', {
      cause: error,
    });
  }
}

export async function createAccessPoint(
  input: ValidatedAccessPointInput,
  createdByUid: string,
): Promise<AccessPointRecord> {
  try {
    const rows = await db
      .insert(accessPoints)
      .values({
        nombrePunto: input.nombrePunto,
        latitud: input.latitud,
        longitud: input.longitud,
        edificio: input.edificio,
        calleAcceso: input.calleAcceso,
        tipoEntrada: input.tipoEntrada,
        createdByUid,
      })
      .returning();

    return rows[0];
  } catch (error) {
    console.error('Database insert failed in createAccessPoint:', error);
    throw new Error('No se pudo guardar el punto de acceso.', {
      cause: error,
    });
  }
}

export async function updateAccessPoint(
  id: string,
  input: ValidatedAccessPointInput,
): Promise<AccessPointRecord | null> {
  try {
    const rows = await db
      .update(accessPoints)
      .set({
        nombrePunto: input.nombrePunto,
        latitud: input.latitud,
        longitud: input.longitud,
        edificio: input.edificio,
        calleAcceso: input.calleAcceso,
        tipoEntrada: input.tipoEntrada,
        updatedAt: new Date(),
      })
      .where(eq(accessPoints.id, id))
      .returning();

    return rows[0] ?? null;
  } catch (error) {
    console.error('Database update failed in updateAccessPoint:', error);
    throw new Error('No se pudo actualizar el punto de acceso.', {
      cause: error,
    });
  }
}

export async function deleteAccessPoint(id: string): Promise<boolean> {
  try {
    const deleted = await db
      .delete(accessPoints)
      .where(eq(accessPoints.id, id))
      .returning({ id: accessPoints.id });

    return deleted.length > 0;
  } catch (error) {
    console.error('Database delete failed in deleteAccessPoint:', error);
    throw new Error('No se pudo eliminar el punto de acceso.', {
      cause: error,
    });
  }
}

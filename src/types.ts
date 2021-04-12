import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";

export type EmContext = {
    em: EntityManager<IDatabaseDriver<Connection>>
};
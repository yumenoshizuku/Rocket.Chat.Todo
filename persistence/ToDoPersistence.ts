import { IPersistence, IPersistenceRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';

export class ToDoPersistence {
    // add a record
    public static async persist(persis: IPersistence, room: IRoom, id: string, roomId: string): Promise<boolean> {
        const associations: Array<RocketChatAssociationRecord> = [
            new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'todo'),
            new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, room.id),
            new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, id),
            new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, roomId),
        ];

        try {
            await persis.updateByAssociations(associations, { id, roomId }, true);
        } catch (err) {
            console.warn(err);
            return false;
        }

        return true;
    }

    // query all records within the "scope"
    public static async findAll(persis: IPersistenceRead): Promise<Array<string>> {
        const associations: Array<RocketChatAssociationRecord> = [
            new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'todo'),
        ];

        let result: Array<string> = [];
        try {
            const records: Array<{ id: string }> = (await persis.readByAssociations(associations)) as Array<{ id: string }>;

            if (records.length) {
                result = records.map(({ id }) => id);
            }
        } catch (err) {
            console.warn(err);
        }

        return result;
    }

    // query all records by room within the "scope"
    public static async findByRoom(persis: IPersistenceRead, room: IRoom): Promise<Array<string>> {
        const associations: Array<RocketChatAssociationRecord> = [
            new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'todo'),
            new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, room.id),
        ];

        let result: Array<string> = [];
        try {
            const records: Array<{ id: string }> = (await persis.readByAssociations(associations)) as Array<{ id: string }>;

            if (records.length) {
                result = records.map(({ id }) => id);
            }
        } catch (err) {
            console.warn(err);
        }

        return result;
    }

    // query all records by room within the "scope"
    public static async removeByRoom(persis: IPersistence, room: IRoom): Promise<boolean> {
        const associations: Array<RocketChatAssociationRecord> = [
            new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'todo'),
            new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, room.id),
        ];

        try {
            await persis.removeByAssociations(associations);
        } catch (err) {
            console.warn(err);
            return false;
        }

        return true;
    }

    // remove all records by id within the "scope"
    public static async removeById(persis: IPersistence, id: string): Promise<boolean> {
        const associations: Array<RocketChatAssociationRecord> = [
            new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'todo'),
            new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, id),
        ];

        try {
            await persis.removeByAssociations(associations);
        } catch (err) {
            console.warn(err);
            return false;
        }

        return true;
    }

    // remove all records within the "scope"
    public static async clear(persis): Promise<boolean> {
        const associations: Array<RocketChatAssociationRecord> = [
            new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'todo'),
        ];

        try {
            await persis.removeByAssociations(associations);
        } catch (err) {
            console.warn(err);
            return false;
        }

        return true;
    }

    // query all records within the "scope"
    public static async findRooms(persis: IPersistenceRead): Promise<Array<string>> {
        const associations: Array<RocketChatAssociationRecord> = [
            new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'todo'),
        ];

        try {
            const assn = await persis.readByAssociations(associations);
            const byRoomId = this.groupBy(assn, (r) => r.roomId);
            return [ ...byRoomId.keys() ];
        } catch (err) {
            console.warn(err);
        }
        return [];
    }

    /**
     * @description
     * Takes an Array<V>, and a grouping function,
     * and returns a Map of the array grouped by the grouping function.
     *
     * @param list An array of type V.
     * @param keyGetter A Function that takes the the Array type V as an input, and returns a value of type K.
     *                  K is generally intended to be a property key of V.
     *
     * @returns Map of the array grouped by the grouping function.
     */
    private static groupBy(list, keyGetter) {
        const map = new Map();
        list.forEach((item) => {
            const key = keyGetter(item);
            const collection = map.get(key);
            if (!collection) {
                map.set(key, [item]);
            } else {
                collection.push(item);
            }
        });
        return map;
    }
}

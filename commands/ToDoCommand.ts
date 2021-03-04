import {IHttp, IModify, IPersistence, IRead} from '@rocket.chat/apps-engine/definition/accessors';
import {App} from '@rocket.chat/apps-engine/definition/App';
import {ISlashCommand, SlashCommandContext} from '@rocket.chat/apps-engine/definition/slashcommands';
import {ToDoPersistence} from '../persistence/ToDoPersistence';

export class ToDoCommand implements ISlashCommand {

    private static async sendMessage(context: SlashCommandContext, modify: IModify, messageText: string): Promise<void> {
        await modify
            .getCreator()
            .finish(await modify
                .getCreator()
                .startMessage()
                .setRoom(context.getRoom())
                .setGroupable(false)
                .setText(messageText));
    }

    private static async sendNotification(context: SlashCommandContext, modify: IModify, messageText: string): Promise<void> {
        const room = context.getRoom();
        await modify
            .getNotifier()
            .notifyRoom(room, await modify
                .getCreator()
                .startMessage()
                .setRoom(room)
                .setText(messageText)
                .getMessage());
    }

    public command = 'todo';
    public i18nDescription = 'todoDescription';
    public i18nParamsExample = 'todoUsage';
    public providesPreview = false;

    constructor(private readonly app: App) {}

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const args = context.getArguments();
        const room = context.getRoom();
        const sender = context.getSender().name;
        const tasks = await ToDoPersistence.findByRoom(read.getPersistenceReader(), room);
        if (!args?.length) {
            await ToDoCommand.sendNotification(context, modify, 'Usage: /todo some task, or /todo LISTALL, or /todo DELETE some task, or /todo DELETEALL');
        } else if (args[0] === 'DELETEALL') {
            const msg = sender + ' deleted all tasks: \n\n' + tasks.join('\n');
            await ToDoCommand.sendMessage(context, modify, msg);
            await ToDoPersistence.removeByRoom(persis, room);
        } else if (args[0] === 'DELETE') {
            const toDelete = args.slice(1).join(' ');
            if (tasks.includes(toDelete)) {
                const msg = sender + ' deleted task: ' + toDelete;
                await ToDoCommand.sendMessage(context, modify, msg);
                await ToDoPersistence.removeById(persis, toDelete);
            } else {
                await ToDoCommand.sendNotification(context, modify, 'There is no task "' + toDelete + '", please make sure the exact task name is used');
            }
        } else if (args[0] === 'LISTALL') {
            const msg = 'Current tasks: \n\n' + tasks.join('\n');
            await ToDoCommand.sendNotification(context, modify, msg);
        } else {
            const todo = args.join(' ');
            await ToDoPersistence.persist(persis, room, todo, room.id);
            const msg = sender + ' created new to-do task: ' + todo;
            await ToDoCommand.sendMessage(context, modify, msg);
        }
    }
}

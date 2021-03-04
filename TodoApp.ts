import {
    IAppAccessors, IConfigurationExtend, IConfigurationModify, IEnvironmentRead, IHttp,
    ILogger, IModify, IPersistence, IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import {IJobContext, StartupType} from '@rocket.chat/apps-engine/definition/scheduler';
import {ISetting, SettingType} from '@rocket.chat/apps-engine/definition/settings';
import {ToDoCommand} from './commands/ToDoCommand';
import {ToDoPersistence} from './persistence/ToDoPersistence';

export class TodoApp extends App {

    private static getCurrentHour(notificationTimeZone: string): string {
        return String(new Date().toLocaleString('en-US', {
            hour: 'numeric',
            hour12: false,
            timeZone: notificationTimeZone,
        })).replace(/^0/, '');
    }

    private static async getSettingValueOrDefault(environment: IEnvironmentRead, id: string): Promise<string> {
        const setting = await environment.getSettings().getById(id);
        if (setting.value) {
            return setting.value;
        } else {
            return String(setting.packageValue);
        }
    }

    private static async getSettingValArrayOrDefault(environment: IEnvironmentRead, id: string): Promise<Array<string>> {
        const notifyAtHoursSetting = await environment.getSettings().getById(id);
        const notifyAtHoursValue = notifyAtHoursSetting.value;
        if (notifyAtHoursValue) {
            return notifyAtHoursValue.split(',');
        } else {
            return String(notifyAtHoursSetting.packageValue).split(',');
        }
    }

    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async onDisable(configurationModify: IConfigurationModify): Promise<void> {
        await configurationModify.scheduler.cancelJob('notify');
    }

    public async onSettingUpdated(setting: ISetting, configurationModify: IConfigurationModify, read: IRead, http: IHttp): Promise<void> {
        await configurationModify.scheduler.scheduleRecurring({
            id: 'notify',
            interval: (await read.getEnvironmentReader().getSettings().getById('notifyInterval')).value,
        });
        console.log('Current hour: ' + TodoApp.getCurrentHour(await TodoApp.getSettingValueOrDefault(read.getEnvironmentReader(), 'notificationTimeZone')));
    }

    public async notify(context: IJobContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const notifyAtHours = await TodoApp.getSettingValArrayOrDefault(read.getEnvironmentReader(), 'notifyAtHours');
        const hourNewYork = TodoApp.getCurrentHour(await TodoApp.getSettingValueOrDefault(read.getEnvironmentReader(), 'notificationTimeZone'));
        if (notifyAtHours.includes(hourNewYork)) {
            const byRoomId = await ToDoPersistence.findRooms(read.getPersistenceReader());
            byRoomId.forEach(async (roomId) => {
                const message = await modify.getCreator().startMessage();
                const room = await read.getRoomReader().getById(roomId);
                if (typeof room === 'undefined') {
                    console.log('Room ' + roomId + ' no longer exists');
                } else {
                    const todos = await ToDoPersistence.findByRoom(read.getPersistenceReader(), room);
                    if (todos?.length) {
                        const text = 'Reminder:\n\n' + (todos).join('\n');
                        message
                            .setRoom(room)
                            .setGroupable(false)
                            .setText(text);
                        await modify.getCreator().finish(message);
                    } else {
                        console.log('Nothing to do. This should not happen.');
                    }
                }
            });
        }
    }

    protected async extendConfiguration(configuration: IConfigurationExtend, environment: IEnvironmentRead): Promise<void> {
        await configuration.slashCommands.provideSlashCommand(new ToDoCommand(this));
        await configuration.settings.provideSetting({
            id: 'notifyAtHours',
            public: true,
            required: false,
            type: SettingType.STRING,
            packageValue: '10,16',
            i18nLabel: 'notifyAtHoursLabel',
            i18nDescription: 'notifyAtHoursDescription',
        });
        await configuration.settings.provideSetting({
            id: 'notificationTimeZone',
            public: true,
            required: false,
            type: SettingType.STRING,
            packageValue: 'America/New_York',
            i18nLabel: 'notificationTimeZoneLabel',
            i18nDescription: 'notificationTimeZoneDescription',
        });
        await configuration.settings.provideSetting({
            id: 'notifyInterval',
            public: true,
            required: false,
            type: SettingType.STRING,
            packageValue: '1 hour',
            i18nLabel: 'notifyIntervalLabel',
            i18nDescription: 'notifyIntervalDescription',
        });
        await configuration.scheduler.registerProcessors([
            {
                id: 'notify',
                processor: this.notify,
                startupSetting: {
                    type: StartupType.RECURRING,
                    interval: await TodoApp.getSettingValueOrDefault(environment, 'notifyInterval'),
                },
            },
        ]);
        console.log('Current hour: ' + TodoApp.getCurrentHour(await TodoApp.getSettingValueOrDefault(environment, 'notificationTimeZone')));
    }

}

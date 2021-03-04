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

    private static getCurrentHour() {
        return String(new Date().toLocaleString('en-US', {
            hour: 'numeric',
            hour12: false,
            timeZone: 'America/New_York',
        })).replace(/^0/, '');
    }

    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async onDisable(configurationModify: IConfigurationModify): Promise<void> {
        await configurationModify.scheduler.cancelJob('notify');
    }

    public async onSettingUpdated(setting: ISetting, configurationModify: IConfigurationModify, read: IRead, http: IHttp): Promise<void> {
        const notifyIntervalValue = (await read.getEnvironmentReader().getSettings().getById('notifyInterval')).value;
        await configurationModify.scheduler.scheduleRecurring({
            id: 'notify',
            interval: notifyIntervalValue,
        });
    }

    public async notify(context: IJobContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const notifyAtHoursSetting = await read.getEnvironmentReader().getSettings().getById('notifyAtHours');
        let notifyAtHours = String(notifyAtHoursSetting.packageValue).split(',');
        const notifyAtHoursValue = notifyAtHoursSetting.value;
        if (notifyAtHoursValue) {
            notifyAtHours = notifyAtHoursValue.split(',');
        }
        const hourNewYork = TodoApp.getCurrentHour();
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
            id: 'notifyInterval',
            public: true,
            required: false,
            type: SettingType.STRING,
            packageValue: '1 hour',
            i18nLabel: 'notifyIntervalLabel',
            i18nDescription: 'notifyIntervalDescription',
        });
        const notifyIntervalSetting = await environment.getSettings().getById('notifyInterval');
        let notifyInterval = String(notifyIntervalSetting.packageValue);
        const notifyIntervalValue = notifyIntervalSetting.value;
        if (notifyIntervalValue) {
            notifyInterval = notifyIntervalValue;
        }
        await configuration.scheduler.registerProcessors([
            {
                id: 'notify',
                processor: this.notify,
                startupSetting: {
                    type: StartupType.RECURRING,
                    interval: notifyInterval,
                },
            },
        ]);
        console.log('Current hour: ' + TodoApp.getCurrentHour());
    }

}

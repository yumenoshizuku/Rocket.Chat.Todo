# Rocket.Chat.Todo
A command-line todo bot for Rocket.Chat

## Installation

Enable the App Framework and development mode in `Administration - General - Apps` on your Rocket.Chat instance.

Change time zone in TodoApp.js

Install rc-apps

`npm install -g @rocket.chat/apps-cli`

In project directory, execute

`npm install && rc-apps deploy --url http://your_rocket_chat_instance_ip:port --username admin_user --password admin_password`

## Usage

`/todo some task`

`/todo LISTALL`

`/todo DELETE some task`

`/todo DELETEALL`

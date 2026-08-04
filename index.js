const {
    Client,
    Collection,
    GatewayIntentBits,
    Events
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const { token } = require("./config.json");
const commandLevels = require("./roles.json");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

const commands = [];
const commandsPath = path.join(__dirname, "commands");

const commandFiles = fs.readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {

    const command = require(
        path.join(commandsPath, file)
    );

    client.commands.set(
        command.data.name,
        command
    );

    commands.push(command.data);

    console.log(`Loaded command: ${command.data.name}`);
}


function getUserLevel(member) {

    if (
        member.roles.cache.some(
            role => role.name === "Bot Administrator"
        )
    ) {
        return 6;
    }


    for (let level = 5; level >= 1; level--) {

        if (
            member.roles.cache.some(
                role =>
                role.name === `Commands - ${level}`
            )
        ) {
            return level;
        }
    }

    return 0;
}


client.once(
    Events.ClientReady,
    async (client) => {

        console.log(
            `Logged in as ${client.user.tag}`
        );

        try {

            await client.application.commands.set(
                commands
            );

            console.log(
                `${commands.length} commands registered.`
            );


            const registered =
                await client.application.commands.fetch();


            console.log("\n=== REGISTERED COMMANDS ===");

            registered.forEach(command => {

                console.log(
                    `- ${command.name}`
                );

            });

            console.log("==========================\n");


        } catch (error) {

            console.error(
                "Command registration error:",
                error
            );
        }
    }
);



client.on(
    Events.InteractionCreate,
    async interaction => {


        if (
            !interaction.isChatInputCommand()
        ) return;


        const command =
            client.commands.get(
                interaction.commandName
            );


        if (!command) return;




        const disabledPath =
            path.join(
                __dirname,
                "disabledCommands.json"
            );


        let disabledCommands = [];


        if (
            fs.existsSync(disabledPath)
        ) {

            disabledCommands =
                JSON.parse(
                    fs.readFileSync(
                        disabledPath,
                        "utf8"
                    )
                );
        }



        if (
            disabledCommands.includes(
                interaction.commandName
            )
        ) {

            return interaction.reply({

                content:
                    "This command is currently disabled.",

                ephemeral: true

            });
        }




        const requiredLevel =
            commandLevels[
                interaction.commandName
            ] ?? 1;



        const userLevel =
            getUserLevel(
                interaction.member
            );



        if (
            userLevel < requiredLevel
        ) {

            return interaction.reply({

                content:
                `You need permission level ${requiredLevel} to use this command.`,

                ephemeral: true

            });
        }



        try {

            await command.execute(
                interaction
            );


        } catch (error) {

            console.error(error);


            if (
                !interaction.replied
            ) {

                await interaction.reply({

                    content:
                    "An error occurred while running this command.",

                    ephemeral: true

                });
            }
        }
    }
);



client.login(token);
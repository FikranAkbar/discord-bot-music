import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check bot latency');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
  const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
  const wsLatency = interaction.client.ws.ping;

  await interaction.editReply(
    `🏓 **Pong!**\n> Roundtrip: **${roundtrip}ms**\n> WebSocket: **${wsLatency}ms**`,
  );
}

import { ChatInputCommandInteraction, Collection, Events, Interaction } from 'discord.js';
import { Command } from '../types/index';
import { checkRateLimit, getRemainingCooldown } from '../utils/rateLimiter';
import { createErrorEmbed } from '../utils/embeds';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(
  interaction: Interaction,
  commands: Collection<string, Command>,
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) {
    console.warn(`[Commands] Unknown command: ${interaction.commandName}`);
    return;
  }

  // Rate limiting: 1 command per user per 2 seconds
  if (!checkRateLimit(interaction.user.id)) {
    const remaining = (getRemainingCooldown(interaction.user.id) / 1000).toFixed(1);
    await interaction.reply({
      embeds: [createErrorEmbed(`You're sending commands too fast. Wait **${remaining}s** before trying again.`)],
      ephemeral: true,
    });
    return;
  }

  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (err) {
    console.error(`[Commands] Error executing /${interaction.commandName}:`, err);

    const errorEmbed = createErrorEmbed('An unexpected error occurred while executing this command.');
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [errorEmbed] }).catch(() => null);
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => null);
    }
  }
}

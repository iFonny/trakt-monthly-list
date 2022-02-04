import { red } from 'colors';
import dayjs from 'dayjs';
import prompts, { Choice, PromptObject } from 'prompts';

export class Prompt {
  public type: 'shows' | 'movies';
  public prefix: string;

  constructor(type: 'shows' | 'movies' = 'shows') {
    this.type = type;
    this.prefix = `[${type.toUpperCase()}]`;
  }

  setType(type: 'shows' | 'movies') {
    this.type = type;
    this.prefix = `[${type.toUpperCase()}]`;
  }

  private prefixMessage = (message: string) => `${this.prefix} ${message}`;

  async chooseMonth() {
    const response = await prompts(
      {
        type: 'date',
        name: 'value',
        message: 'Pick a month',
        mask: 'MM-YYYY',
        validate: (date) => (date > Date.now() ? 'Not in the future' : true),
      },
      { onCancel: () => process.exit() },
    );

    return {
      yearMonth: dayjs(response.value).format('YYYY/MM'),
      startAt: dayjs(response.value).startOf('month').format(),
      endAt: dayjs(response.value).endOf('month').format(),
    };
  }

  async start() {
    const response = await prompts(
      {
        type: 'confirm',
        name: 'value',
        message: `Do you want to get watched ${this.type} ?`,
        initial: true,
      },
      { onCancel: () => process.exit() },
    );

    return response.value;
  }

  async confirm(message: string, initial = true): Promise<boolean> {
    const response = await prompts(
      {
        type: 'confirm',
        name: 'value',
        message: red(message),
        initial,
      },
      { onCancel: () => process.exit() },
    );

    return response.value;
  }

  async chooseListName(initial: string): Promise<string> {
    const response = await prompts(
      {
        type: 'text',
        name: 'value',
        message: this.prefixMessage('Name of the list'),
        initial,
      },
      { onCancel: () => process.exit() },
    );

    return response.value;
  }

  async chooseItemsToAdd(choices: Choice[]) {
    const response = await prompts(
      {
        type: 'autocompleteMultiselect',
        name: 'values',
        message: this.prefixMessage(`Pick ${this.type} to add to the list`),
        choices,
        optionsPerPage: 20,
      } as PromptObject & { optionsPerPage?: number },
      { onCancel: () => process.exit() },
    ); // Missing type definition for optionsPerPage

    return response.values;
  }
}

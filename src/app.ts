// Load .env file
import dotenv from 'dotenv';
dotenv.config();

import { Prompt } from './prompt';
import {
  addMoviesToList,
  addShowsToList,
  createTraktList,
  getMoviesToAddToList,
  getShowsToAddToList,
  getWatchedMovies,
  getWatchedShows,
  traktAuth,
} from './services';

async function run() {
  // Authenticate with trakt
  await traktAuth();

  const prompt = new Prompt();

  const { yearMonth, startAt, endAt } = await prompt.chooseMonth();

  /* --- TV SHOWS --- */

  prompt.setType('shows');
  const shouldGetShows = await prompt.start();

  if (shouldGetShows) {
    // Get the list of shows watched in the month
    const watchedShows = await getWatchedShows(startAt, endAt);

    // Create and get the trakt list for the month
    const selectedList = await createTraktList(prompt, `[${yearMonth}] TV SHOWS`, `TV Shows watched in ${yearMonth}`);

    // Get the list of shows to add in the list
    const selectedShows = await getShowsToAddToList(prompt, watchedShows);

    // Add items to list
    await addShowsToList(selectedList, selectedShows);
  }

  /* --- MOVIES --- */

  prompt.setType('movies');
  const shouldGetMovies = await prompt.start();

  if (shouldGetMovies) {
    // Get the list of movies watched in the month
    const watchedMovies = await getWatchedMovies(startAt, endAt);

    // Create and get the trakt list for the month
    const selectedList = await createTraktList(prompt, `[${yearMonth}] MOVIES`, `Movies watched in ${yearMonth}`);

    // Get the list of shows to add in the list
    const selectedShows = await getMoviesToAddToList(prompt, watchedMovies);

    // Add items to list
    await addMoviesToList(selectedList, selectedShows);
  }

  console.info('ツ'.rainbow);
}

run();

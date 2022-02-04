import { blue, green, grey, yellow } from 'colors';
import Level from 'level-ts';
import { groupBy, range, sortBy } from 'lodash';
import { Choice } from 'prompts';
import { TraktList } from 'trakt.tv';
import { Prompt } from './prompt';
import { Trakt } from './trakt';
import { MovieHistoryEntry, ShowHistoryEntry, WatchedMovie, WatchedShow } from './types';

// --- Constants ---
const MIN_EPISODES_BY_SHOW = 3;

// Create a LevelDB instance
const database = new Level('./database');

// Initialize Trakt instance
const trakt = new Trakt(database);

export const traktAuth = () => trakt.auth();

//=======================================================================//
//     COMMON                                                            //
//=======================================================================//

// Prompt and create the trakt list for the month
export async function createTraktList(prompt: Prompt, name: string, description: string): Promise<TraktList> {
  let selectedList: TraktList | undefined;
  while (!selectedList) {
    const listName = await prompt.chooseListName(name);

    const lists = await trakt.getLists();
    const list = lists.find((list) => list.name === listName);

    if (list) {
      const shouldOverride = await prompt.confirm(
        `This list already exists (${trakt.getListLink(list)}), ` +
          'do you want to replace it? (all the items will be removed)',
        false,
      );
      if (shouldOverride) {
        await trakt.deleteList(list.ids?.slug);
        console.info('List', blue(`${list.name}`), 'deleted');
        selectedList = await trakt.createList(listName, description);
      }
    } else selectedList = await trakt.createList(listName, description);
  }
  console.info('List', blue(`${selectedList.name}`), 'created:', grey.underline(trakt.getListLink(selectedList)));

  return selectedList;
}

//=======================================================================//
//     TV SHOWS                                                          //
//=======================================================================//

// Get the list of episodes watched in the month and group them by show
export async function getWatchedShows(startAt: string, endAt: string): Promise<WatchedShow[]> {
  const showsHistory = await trakt.getMonthlyHistory(startAt, endAt, 'shows');
  const groupedWatchedShows = groupBy(showsHistory, (e) => `${e.show?.title} - ${e.show?.ids?.trakt}`);

  return Object.values(groupedWatchedShows)
    .map((historyEntries) => {
      const episodes = sortBy(
        historyEntries.map((episode) => ({ watched_at: episode.watched_at, ...episode.episode })),
        (episode) => new Date(episode.watched_at),
      );

      return {
        ...historyEntries[0].show,
        watchedEpisodes: historyEntries.length,
        isNewShow: episodes[0].season === 1,
        firstSeason: episodes[0].season,
        lastSeason: episodes[episodes.length - 1].season,
        episodes: episodes,
      };
    })
    .sort((a, b) => Number(b.isNewShow) - Number(a.isNewShow)); // Sort by new/continuing (new first);
}

// Get the shows selected using the prompt
export async function getShowsToAddToList(prompt: Prompt, shows: WatchedShow[]): Promise<WatchedShow[]> {
  return await prompt.chooseItemsToAdd(
    shows.map((show): Choice => {
      let title = `${show.title} (${show.year})`;

      // Get season(s) to add to the title
      const seasons = `S${show.firstSeason}${show.lastSeason !== show.firstSeason ? `-S${show.lastSeason}` : ''}`;

      title += ` - ${show.watchedEpisodes} episode(s)`; // Display number of watched episodes
      title += ` - ${show.isNewShow ? yellow(`NEW (${seasons})`) : `(${seasons})`}`; // Display if show is new (S1) or continuing + season(s)

      // Set the color to gray if the show don't have enough watched episodes
      if (show.watchedEpisodes < MIN_EPISODES_BY_SHOW) title = grey(title);

      return { title, value: show, selected: show.watchedEpisodes >= MIN_EPISODES_BY_SHOW };
    }),
  );
}

// Add to list shows for new shows, and seasons for continuing shows
export async function addShowsToList(list: TraktList, shows: WatchedShow[]) {
  await trakt.addItemsToList(list.ids?.trakt, {
    shows: shows.map((show) => {
      const showId = { ids: { trakt: show.ids.trakt } };
      if (show.isNewShow) return showId;
      else
        return {
          ...showId,
          seasons: range(
            show.firstSeason || show.lastSeason, // use lastSeason if firstSeason is a special (S0)
            (show.lastSeason || show.firstSeason) + 1, // use firstSeason if lastSeason is a special (S0)
          ).map((n) => ({
            number: n,
          })),
        };
    }),
  });

  console.info(shows.length, 'show(s) added to list', blue(`${list.name}`), `(${green(trakt.getListLink(list))})`);
}

//=======================================================================//
//     MOVIES                                                            //
//=======================================================================//

// Get the list of movies watched in the month
export async function getWatchedMovies(startAt: string, endAt: string): Promise<WatchedMovie[]> {
  const moviesHistory = await trakt.getMonthlyHistory(startAt, endAt, 'movies');

  return moviesHistory.map((historyEntry) => ({
    ...historyEntry.movie,
    watchedAt: historyEntry.watched_at,
  }));
}

// Get the movies selected using the prompt
export async function getMoviesToAddToList(prompt: Prompt, movies: WatchedMovie[]): Promise<WatchedMovie[]> {
  return await prompt.chooseItemsToAdd(
    movies.map((movie): Choice => {
      let title = `${movie.title} (${movie.year})`;

      return { title, value: movie, selected: true };
    }),
  );
}

// Add movies to list
export async function addMoviesToList(list: TraktList, movies: WatchedMovie[]) {
  await trakt.addItemsToList(list.ids?.trakt, { movies });

  console.info(movies.length, 'movie(s) added to list', blue(`${list.name}`), `(${green(trakt.getListLink(list))})`);
}

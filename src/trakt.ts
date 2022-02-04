import Level from 'level-ts';
import TraktClient, { Season, TraktList } from 'trakt.tv';
import { blue, red, yellow } from 'colors';
import { TraktAddToListResponse, Show, Movie, MovieHistoryEntry, ShowHistoryEntry } from './types';

export class Trakt {
  private trakt: TraktClient;
  private db: Level;
  private username?: string;

  constructor(db: Level) {
    this.db = db;
    this.trakt = new TraktClient({
      client_id: process.env.TRAKT_CLIENT_ID as string,
      client_secret: process.env.TRAKT_CLIENT_SECRET as string,
      // debug: true,
      // redirect_uri: null,   // defaults to 'urn:ietf:wg:oauth:2.0:oob'
      // api_url: null         // defaults to 'https://api.trakt.tv'
    });
  }

  async auth() {
    let access_token: string | undefined;
    let expires: number | undefined;
    let refresh_token: string | undefined;

    try {
      access_token = await this.db.get('trakt_token');
      expires = await this.db.get('trakt_expires');
      refresh_token = await this.db.get('trakt_refresh');
    } catch (err) {}

    if (access_token) this.trakt.import_token({ access_token, expires, refresh_token });
    else {
      let poll = await this.trakt.get_codes();
      // poll.verification_url: url to visit in a browser
      // poll.user_code: the code the user needs to enter on trakt

      console.info('Open url', blue(`${poll.verification_url}`), 'and enter code:', red(`${poll.user_code}`));

      // verify if app was authorized
      await this.trakt.poll_access(poll);

      let { access_token, expires, refresh_token } = this.trakt.export_token();
      await this.db.put('trakt_token', access_token);
      await this.db.put('trakt_expires', expires);
      await this.db.put('trakt_refresh', refresh_token);
    }

    let settings = await this.trakt.users.settings();
    this.username = settings.user.username;

    if (this.username) console.info('Logged to Trakt using', yellow(this.username));
    else {
      console.error('Trakt login failed');
      process.exit(1);
    }
  }

  async getMonthlyHistory<T extends 'movies' | 'shows' | 'seasons' | 'episodes'>(
    startAt: string,
    endAt: string,
    type: T,
  ): Promise<T extends 'movies' ? MovieHistoryEntry[] : ShowHistoryEntry[]> {
    if (this.username) {
      const history = await this.trakt.users.history({
        username: this.username,
        type,
        start_at: startAt,
        end_at: endAt,
        limit: 1000,
        // extended: 'full',
      });

      return history;
    } else {
      console.error('Error in getMonthHistory: username not set');
      process.exit(1);
    }
  }

  async getLists() {
    if (this.username) {
      const lists: TraktList[] = await this.trakt.users.lists.get({ username: this.username });
      return lists;
    } else {
      console.error('Error in getLists: username not set');
      process.exit(1);
    }
  }

  getListLink = (list: TraktList) => `https://trakt.tv/users/${list.user?.username}/lists/${list.ids?.slug}`;

  async createList(name: string, description: string) {
    if (this.username) {
      const list: TraktList = await this.trakt.users.lists.create({
        username: this.username,
        name,
        description,
        privacy: 'private',
        display_numbers: true,
      });
      return list;
    } else {
      console.error('Error in createList: username not set');
      process.exit(1);
    }
  }

  async deleteList(addItemsToList?: number | string) {
    if (this.username && addItemsToList) {
      await this.trakt.users.list.delete({ username: this.username, id: addItemsToList });
    } else {
      console.error('Error in deleteList: username or id not set');
      process.exit(1);
    }
  }

  async addItemsToList(
    idOrSlug: number | string | undefined,
    items: {
      movies?: Movie[]; // Only ids required
      shows?: (Show & { seasons?: Season[] })[]; // Only ids required
      // seasons?: Season[];
      // episodes?: Episode[];
    },
  ): Promise<TraktAddToListResponse> {
    if (this.username && idOrSlug) {
      return await this.trakt.users.list.items.add({
        id: idOrSlug,
        username: this.username,
        movies: items.movies,
        shows: items.shows,
      });
    } else {
      console.error('Error in addItemsToList: username or idOrSlug not set');
      process.exit(1);
    }
  }
}

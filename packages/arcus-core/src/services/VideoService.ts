import Bridge from '../bridge';
import cornea from '../cornea';

const VideoService = {
  onRecordingsDeleted(callback: (data: Record<string, unknown>) => void): void {
    cornea.on('video video:RecordingsDeleted', callback);
  },
  onQuotaReport(callback: (data: Record<string, unknown>) => void): void {
    cornea.on('video video:QuotaReport', callback);
  },

  ListRecordings(placeId: string, all?: boolean, type?: string): Promise<Record<string, unknown>> {
    return Bridge.request('video:ListRecordings', 'SERV:video:', { placeId, all, type });
  },

  PageRecordings(
    placeId: string,
    limit: number,
    token: string,
    all?: boolean,
    inprogress?: boolean,
    type?: string,
    latest?: string,
    earliest?: string,
    cameras?: string[],
    tags?: string[],
  ): Promise<Record<string, unknown>> {
    return Bridge.request('video:PageRecordings', 'SERV:video:', {
      placeId, limit, token, all, inprogress, type, latest, earliest, cameras, tags,
    });
  },

  StartRecording(
    placeId: string,
    accountId: string,
    cameraAddress: string,
    stream: boolean,
    duration?: number,
  ): Promise<Record<string, unknown>> {
    return Bridge.request('video:StartRecording', 'SERV:video:', {
      placeId, accountId, cameraAddress, stream, duration,
    });
  },

  StopRecording(placeId: string, recordingId: string): Promise<Record<string, unknown>> {
    return Bridge.request('video:StopRecording', 'SERV:video:', { placeId, recordingId });
  },

  GetQuota(placeId: string): Promise<Record<string, unknown>> {
    return Bridge.request('video:GetQuota', 'SERV:video:', { placeId });
  },

  GetFavoriteQuota(placeId: string): Promise<Record<string, unknown>> {
    return Bridge.request('video:GetFavoriteQuota', 'SERV:video:', { placeId });
  },

  DeleteAll(placeId: string, includeFavorites?: boolean): Promise<Record<string, unknown>> {
    return Bridge.request('video:DeleteAll', 'SERV:video:', { placeId, includeFavorites });
  },
};

export default VideoService;

import Bridge from '../bridge';

const SceneService = {
  ListScenes(placeId: string): Promise<Record<string, unknown>> {
    return Bridge.request('scene:ListScenes', 'SERV:scene:', { placeId });
  },

  ListSceneTemplates(placeId: string): Promise<Record<string, unknown>> {
    return Bridge.request('scene:ListSceneTemplates', 'SERV:scene:', { placeId });
  },
};

export default SceneService;

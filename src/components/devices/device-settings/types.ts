export interface ParamDescriptor {
  paramId: string;
  name: string;
  description: string;
  type: 'enum' | 'range' | 'boolean';
  values?: Record<string, string>;
  min?: number;
  max?: number;
  dflt: number;
  value?: string;
}

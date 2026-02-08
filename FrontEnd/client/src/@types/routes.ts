import { type ComponentType } from 'react';

export type RouteConfig = {
  key: string;
  path: string;
  component: ComponentType;
  authority: string[];
};

export type Routes = RouteConfig[];

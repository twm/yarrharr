import React from 'react';
import { hot } from 'react-hot-loader';

export const HotWrapper = __hot__ ? hot(module)(React.Fragment) : React.Fragment;

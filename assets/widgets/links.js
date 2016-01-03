'use strict';
import React from 'react';
import { Link, IndexLink } from 'react-router';

/**
 * This module contains wrappers around react-router's <Link> component that
 * know about URL layout.  Using them decouples a component from knowledge of
 * the route configuration.
 */

export function FeedLink(props) {
    const { feedId, children } = props;
    return <Link to={`/feed/${feedId}/`} {...props}>{children}</Link>;
}

export function LabelLink(props) {
    const { labelId, children } = props;
    return <Link to={`/label/${labelId}/`} {...props}>{children}</Link>;
}

export function RootLink(props) {
    return <IndexLink to="/" {...props}>{props.children}</IndexLink>;
}

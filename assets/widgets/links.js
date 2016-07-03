'use strict';
import React from 'react';
import { Link, IndexLink } from 'react-router';

/**
 * This module contains wrappers around react-router's <Link> component that
 * know about URL layout.  Using them decouples a component from knowledge of
 * the route configuration.
 */

export function AllLink(props) {
    const { feedId, filter=null } = props;
    var path = "/all/";
    if (filter) {
        path += `?filter=${filter}`;
    }
    return <Link to={path} {...props} />;
}

export function ArticleLink(props) {
    const { articleId, children } = props;
    return <Link to={`/article/${articleId}/`} {...props}>{children}</Link>;
}

export function FeedLink(props) {
    const { feedId, filter=null, children } = props;
    var path = `/feed/${feedId}/`;
    if (filter) {
        path += `?filter=${filter}`;
    }
    return <Link to={path} {...props}>{children}</Link>;
}

export function LabelLink(props) {
    const { labelId, children } = props;
    return <Link to={`/label/${labelId}/`} {...props}>{children}</Link>;
}

export function RootLink(props) {
    return <IndexLink to="/" {...props}>{props.children}</IndexLink>;
}

export function InventoryLink(props) {
    return <Link to="/inventory/" {...props}>{props.children}</Link>;
}

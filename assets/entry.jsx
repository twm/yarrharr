// This file is the Webpack entry point to the whole codebase.
import { applyMiddleware, createStore, combineReducers } from 'redux';
import thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';
import { Provider, connect } from 'react-redux';
import { Router, Route, IndexRoute, Link } from 'react-router';
import { createHistory } from 'history';
import { syncReduxAndRouter, routeReducer } from 'redux-simple-router';
import React from 'react';
import ReactDOM from 'react-dom';

import './base.less';
import Article from './Article.js';
import ScrollSpy from './ScrollSpy.js';

import { REQUEST_ARTICLES, RECEIVE_ARTICLES, FAIL_ARTICLES } from './actions.js';
function articleReducer(state = window.props.articlesById, action) {
    if (action.type === REQUEST_ARTICLES) {
        const patch = {};
        const flags = {loading: true, error: false};
        action.articleIds.forEach((id) => {
            patch[id] = Object.assign({}, state[id], flags);
        });
        return Object.assign({}, state, patch);
    } else if (action.type === RECEIVE_ARTICLES) {
        return Object.assign({}, state, action.articlesById);
    } else if (action.type === FAIL_ARTICLES) {
        const patch = {};
        const flags = {loading: false, error: true};
        action.articleIds.forEach((id) => {
            patch[id] = Object.assign({}, state[id], flags);
        });
        return Object.assign({}, state, patch);
    }
    return state;
}

function feedReducer(state = window.props.feedsById, action) {
    // TODO: Support feed CRUD.
    return state;
}

import { REQUEST_FEED_SNAPSHOT, RECEIVE_FEED_SNAPSHOT, FAIL_FEED_SNAPSHOT } from './actions.js';
function feedSnapshotReducer(state = {}, action) {
    if (action.type === REQUEST_FEED_SNAPSHOT) {
        return Object.assign({}, state, {
            [action.feedId]: {
                loading: true,
                error: false,
                articleIds: [],
            },
        });
    } else if (action.type === RECEIVE_FEED_SNAPSHOT) {
        return Object.assign({}, state, {
            [action.feedId]: {
                loading: false,
                error: false,
                articleIds: action.articleIds,
            },
        });
    } else if (action.type === FAIL_FEED_SNAPSHOT) {
        return Object.assign({}, state, {
            [action.feedId]: Object.assign({}, state[action.feedId], {
                loading: false,
                error: true,
            }),
        });
    }
    return state;
}

function labelReducer(state = window.props.labelsById, action) {
    // TODO: Support label CRUD.
    return state;
}

function orderReducer(state = 'date', action) {
    return state;
}

function filterReducer(state = 'all', action) {
    return state;
}


const reducer = combineReducers({
    articlesById: articleReducer,
    feedsById: feedReducer,
    feedSnapshots: feedSnapshotReducer,
    labelsById: labelReducer,
    order: orderReducer,
    filter: filterReducer,
    routing: routeReducer,
});
const middleware = [
    thunkMiddleware,
    createLogger(),
];
const store = applyMiddleware(...middleware)(createStore)(reducer);

const history = createHistory();
syncReduxAndRouter(history, store);

var ArticleView = (props) => {
    const article = props.articlesById[props.params.articleId];
    if (article) {
        return <Article feed={props.feedsById[article.feedId]} {...article} />;
    } else {
        return <div>Loading article {props.params.articleId}&hellip;</div>;
    }
}
ArticleView.propTypes = {
    params: React.PropTypes.shape({
        articleId: React.PropTypes.string.isRequired,
    }).isRequired,
    articlesById: React.PropTypes.objectOf(React.PropTypes.object).isRequired,
    feedsById: React.PropTypes.objectOf(React.PropTypes.object).isRequired,
};

const ArticleViewRedux = connect(state => {
    return {
        articlesById: state.articlesById,
        feedsById: state.feedsById,
    };
}, null)(ArticleView);

const Root = React.createClass({
    render() {
        return <div id="yarrharr">{this.props.children}</div>;
    }
});

/**
 * Get all the labels, sorted alphabetically.
 *
 * @param state
 */
function sortedLabels({labelsById}) {
    var labelList = Object.keys(labelsById).map((labelId) => labelsById[labelId]);
    labelList.sort((a, b) => {
        var textA = a.text.toLowerCase();
        var textB = b.text.toLowerCase();
        return (titleA < titleB) ? -1 :
               (titleA > titleB) ? 1 :
               b.id - a.id;
    });
    return labelList;
}

/**
 * Compute a sorted list of available feeds.
 *
 * @param state
 */
function sortedFeeds({feedsById}) {
    var feedList = Object.keys(feedsById).map((feedId) => feedsById[feedId]);
    feedList.sort((a, b) => {
        // TODO: Investigate Intl.Collator and friends to make this more correct.
        var titleA = (a.text || a.title).toLowerCase();
        var titleB = (b.text || b.title).toLowerCase();
        return (titleA < titleB) ? -1 :
               (titleA > titleB) ? 1 :
               b.id - a.id;
    })
    return feedList;
}

function RootView({labelList, feedList}) {
    return <div className="root">
        <div className="labels">
            <h1>Labels</h1>
            {labelList.length
                ? <ul>{labelList.map((label) => <li key={label.id}><Link to={`/label/${label.id}/`}>{label.text}</Link></li>)}</ul>
                : <div>No labels.  Add one?</div>}
        </div>
        <div className="feeds">
            <h1>Feeds</h1>
            {feedList.length
                ? <ul>{feedList.map((feed) =>
                    <li key={feed.id}>
                        <Link to={`/feed/${feed.id}/`}>{feed.text || feed.title}</Link>
                    </li>)}</ul>
                : <div>No feeds.  Add one?</div>}
        </div>
    </div>;
}
RootView.propTypes = {
    labelList: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
    feedList: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
};

const RootViewRedux = connect(state => {
    return {
        labelList: sortedLabels(state),
        feedList: sortedFeeds(state),
    };
}, null)(RootView);


function LabelView(props) {
    return <div>Label {props.params.labelId}</div>;
}
const LabelViewRedux = connect(state => state, null)(LabelView);


function FeedView({params, feedsById, feedSnapshots, articlesById, dispatch}) {
    const feedId = params.feedId;
    const feed = feedsById[feedId];
    const title = feed.text || feed.title;
    const snapshot = feedSnapshots[feedId];
    if (!snapshot || snapshot.loading) {
        return (
            <div>
                <h1>{title}</h1>
                <p>Loading&hellip;</p>
            </div>
        );
    }
    if (snapshot.error) {
        return (
            <div>
                <h1>{title}</h1>
                <p>
                    Failed to load&hellip;
                    <a href={`/feeds/${feedId}/`} onClick={(event) => {
                        event.preventDefault();
                        dispatch(showFeed(feedId));
                    }}>retry</a>.
                </p>
            </div>
        );
    }
    return (
        <div>
            <h1>{title}</h1>
            {(snapshot.articleIds.length > 0)
                ? <ScrollSpy onNearBottom={() => { dispatch(loadMore(snapshot.articleIds)); }}>
                    {renderArticles(snapshot.articleIds, articlesById, feedsById)}
                </ScrollSpy>
                : <p>No articles</p>}
        </div>
    );
}
const FeedViewRedux = connect(state => state, null)(FeedView);


function renderArticles(articleIds, articlesById, feedsById) {
    if (!articleIds.length) {
        return <p>No articles</p>;
    }
    const elements = [];
    for (let id of articleIds) {
        const article = articlesById[id];
        if (article) {
            if (article.loading) {
                elements.push(<p>Loading&hellip;</p>);
                break;
            }
            const feed = feedsById[article.feedId];
            elements.push(<Article key={id} feed={feed} {...article} />);
        } else {
            // We only render up to the first unavailable article.  This
            // ensures that loading always occurs at the end.
            break;
        }
    }
    return elements;
}

import { showFeed, loadMore } from './actions.js';
ReactDOM.render(
    <Provider store={store}>
        <Router history={history}>
            <Route path="/" component={Root}>
                <IndexRoute component={RootViewRedux} />
                <Route path="article/:articleId" component={ArticleViewRedux} />
                <Route path="label/:labelId" component={LabelViewRedux} />
                <Route path="feed/:feedId" component={FeedViewRedux} onEnter={(nextState) => {
                    store.dispatch(showFeed(nextState.params.feedId));
                }} />
            </Route>
        </Router>
    </Provider>,
    document.getElementById("app")
);

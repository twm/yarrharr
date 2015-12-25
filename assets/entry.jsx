// This file is the Webpack entry point to the whole codebase.
import { createStore, combineReducers } from 'redux';
import { Provider, connect } from 'react-redux';
import { Router, Route, IndexRoute } from 'react-router';
import { createHistory } from 'history';
import { syncReduxAndRouter, routeReducer } from 'redux-simple-router';
import React from 'react';
import ReactDOM from 'react-dom';
import { Article, Yarrharr } from "./Yarrharr.jsx";

function articleReducer(state = window.props.articlesById, action) {
    return state;
}

function feedReducer(state = window.props.feedsById, action) {
    // TODO: Support feed CRUD.
    return state;
}

function labelReducer(state = window.props.labelsById, action) {
    // TODO: Support label CRUD.
    return state;
}

function snapshotReducer(state = window.props.snapshot, action) {
    return state;
}

// FIXME: Replace with routing.
function snapshotParamsReducer(state = window.props.snapshotParams, action) {
    return state;
}

const reducer = combineReducers({
    articlesById: articleReducer,
    feedsById: feedReducer,
    labelsById: labelReducer,
    snapshot: snapshotReducer,
    snapshotParams: snapshotParamsReducer,
    routing: routeReducer,
});
const store = createStore(reducer);
const history = createHistory();

syncReduxAndRouter(history, store);

const YarrharrRedux = connect(state => state, null)(Yarrharr);

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
                ? labelList.map((label) => <div key={label.id}>{label.text}</div>)
                : <div>No labels.  Add one?</div>}
        </div>
        <div className="feeds">
            <h1>Feeds</h1>
            {feedList.length
                ? feedList.map((feed) => <div key={feed.id}>{feed.text || feed.title}</div>)
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

ReactDOM.render(
    <Provider store={store}>
        <Router history={history}>
            <Route path="/" component={Root}>
                <IndexRoute component={RootViewRedux} />
                <Route path="article/:articleId" component={ArticleViewRedux} />
                {/*
                <Route path="label/:labelId/:view/:sort" component={LabelView} />
                <Route path="feed/:feedId/:view/:sort" component={FeedView} />
                */}
            </Route>
        </Router>
    </Provider>,
    document.getElementById("app")
);

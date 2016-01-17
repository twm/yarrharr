import React from 'react';
import { ArticleLink, FeedLink } from 'widgets/links.js';
import { ArrowRight } from 'widgets/icons.js';
import { STATE_NEW, STATE_SAVED, STATE_DONE } from 'actions.js';
import "./ListArticle.less";

const NEXT_STATE = {
    [STATE_NEW]: STATE_DONE,
    [STATE_DONE]: STATE_SAVED,
    [STATE_SAVED]: STATE_NEW,
};
const STATE_TEXT = {
    [STATE_NEW]: "New",
    [STATE_DONE]: "Done",
    [STATE_SAVED]: "Saved",
};

const StateToggle = React.createClass({
    propTypes: {
        state: React.PropTypes.oneOf([STATE_NEW, STATE_SAVED, STATE_DONE]).isRequired,
        marking: React.PropTypes.oneOf([null, STATE_NEW, STATE_SAVED, STATE_DONE]),
        onMark: React.PropTypes.func.isRequired,
    },
    getDefaultProps() {
        return {marking: null};
    },
    getInitialState() {
        return {pendingMark: null};
    },
    handleClick(event) {
        event.preventDefault();
        if (this.state.pendingMark) {
            window.clearTimeout(this._timeout);
        }
        const prevState = this.getDisplayState();
        const nextState = NEXT_STATE[prevState];
        this.setState({pendingMark: nextState});
        this._timeout = window.setTimeout(() => {
            this._timeout = null;
            this.setState({pendingMark: null});
            this.props.onMark(this.props.id, nextState);
        }, 300);
    },
    componentWillUnmount() {
        // We immediately flush any pending mark when unmounting.  Presumably
        // the user won't be clicking again, so the intended state can't change.
        if (this.state.pendingMark) {
            window.clearTimeout(this._timeout);
            this.props.onMark(this.props.id, this.state.pendingMark);
        }
    },
    getDisplayState() {
        return this.state.pendingMark || this.props.marking || this.props.state;
    },
    render() {
        const displayState = this.getDisplayState();
        const marking = this.state.pendingMark || this.props.marking;
        const className = "state-toggle state-" + displayState + (marking ? " marking " : "");
        return <button className={className} onClick={this.handleClick} {...this.props}>
            {STATE_TEXT[displayState]}
        </button>;
    },
});


const MONTH_TO_WORD = {
    '01': 'Jan',
    '02': 'Feb',
    '03': 'Mar',
    '04': 'Apr',
    '05': 'May',
    '06': 'Jun',
    '07': 'Jul',
    '08': 'Aug',
    '09': 'Sep',
    '10': 'Oct',
    '11': 'Nov',
    '12': 'Dec',
};


function Date({dateTime}) {
    const year = dateTime.slice(0, 4);
    const month = dateTime.slice(5, 7);
    const day = dateTime.slice(8, 10);
    const monthWord = MONTH_TO_WORD[month];
    return <time className="date-block" dateTime={dateTime}>
        <span className="month">{monthWord}</span>
        <span className="day">{day.replace(/^0/, '')}</span>
        <span className="year">{year}</span>
    </time>;
}

function ListArticle(props) {
    return <div className="list-article">
        <StateToggle {...props} />
        <div className="middle">
            <FeedLink feedId={props.feed.id} className="feed">
                {props.feed.text || props.feed.title}
            </FeedLink>
            <a className="external-link" href={props.url} target="_blank">{props.title}</a>
        </div>
        <ArticleLink articleId={props.id} className="view-link">
            <Date dateTime={props.date} />
            <ArrowRight alt="View Article" className="arrow" />
        </ArticleLink>
    </div>;
}

module.exports = ListArticle;

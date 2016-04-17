import React from 'react';
import { ArticleLink, FeedLink } from 'widgets/links.js';
import { ArrowRight } from 'widgets/icons.js';
import { StateToggle } from 'widgets/StateToggle.js';
import "./ListArticle.less";

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


function VerticalDate({dateTime}) {
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
            <VerticalDate dateTime={props.date} />
            <ArrowRight alt="View Article" className="arrow" />
        </ArticleLink>
    </div>;
}

module.exports = ListArticle;

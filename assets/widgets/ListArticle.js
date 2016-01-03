import React from 'react';
import "./ListArticle.less";

const ListArticle = React.createClass({
    render() {
        if (this.props.loading) {
            return <div className="list-article loading"></div>;
        }
        var className = this.props.focused ? "list-article focused" : "list-article";
        return <div className={className}>
            <span className="icon">
                <img src={this.props.iconUrl} alt="*" width="16" height="16" />
            </span>
            <span className="meta">
                <span className="feed">{this.props.feed.text || this.props.feed.title}</span>
                <time dateTime={this.props.date}>{this.props.date}</time>
            </span>
            <a className="title" href={this.props.url} target="_blank">{this.props.title}</a>
        </div>
    }
});

module.exports = ListArticle;

import React from 'react';
import "./article.less";

const Article = React.createClass({
    getInitialState() {
        return {
            newProgress: false,
            savedProgress: false,
            doneProgress: false,
        };
    },
    setArticleState(state) {
        const body = new FormData();
        body.append('article', String(this.props.id));
        body.append('state', state);

        var s = {};
        s[state + "Progress"] = true;
        this.setState(s);

        fetch('/state/', {
            method: 'POST',
            body: body,
            headers: new Headers({
                'X-CSRFToken': document.cookie.match(/csrftoken=([^\s;]+)/)[1],
            }),
            credentials: 'same-origin',
        }).then((response) => {
            if (!response.ok) {
                throw new Error(response);
            }
            return response.json();
        }).then((json) => {
            // TODO: Update global props?  Probably should add a real dataflow
            // abstraction in here somewhere... Redux?
            console.log("done setting article state to " + state);
            s[state + "Progress"] = false;
            this.setState(s);
            // XXX FIXME Ew ew ew ew ew
            this.props.controller.setState({
                articlesById: assign({}, this.props.controller.state.articlesById, json),
            });
        }).catch((e) => {console.error(e)});

    },
    stateButtonClass(state) {
        var className = (this.props.state === state) ? "current" : "";
        if (this.state[state + 'Progress']) {
            className += ' progress';
        }
        return className;
    },
    render() {
        return (
            <article>
                <h1><a href={this.props.url}>{this.props.title}</a></h1>
                {this.props.author
                    ? <p className="meta">By {this.props.author} from {this.props.feed.text || this.props.feed.title}</p>
                    : <p className="meta">From {this.props.feed.text || this.props.feed.title}</p>}
                <p className="meta">Posted {this.props.date}</p>
                <div>
                    <div className="content" dangerouslySetInnerHTML={{__html: this.props.content}} />
                    <footer>
                        <button className={this.stateButtonClass("new")} onClick={this.setArticleState.bind(this, "new")}>New</button>
                        <button className={this.stateButtonClass("saved")} onClick={this.setArticleState.bind(this, "saved")}>Saved</button>
                        <button className={this.stateButtonClass("done")} onClick={this.setArticleState.bind(this, "done")}>Done</button>
                        <a href={this.props.url} target="_blank">View externally</a>
                    </footer>
                </div>
            </article>
        );
    }
});

module.exports = Article;

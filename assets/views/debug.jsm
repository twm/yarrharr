import React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'react-redux';
import { Title } from 'widgets/Title.jsm';
import { HomeIcon, LabelIcon, FeedIcon, ArrowLeftIcon, ArrowRightIcon, OutboundIcon, EditIcon, WideIcon, NarrowIcon, AscDescIcon } from 'widgets/icons.js';
import { FaveToggle, ReadToggle } from 'widgets/StateToggle.js';
import { RootLink, InventoryLink, LabelListLink, AddFeedLink } from 'widgets/links.js';
import './debug.less';

import { Tabs } from 'widgets/Tabs.js';
import { GlobalBar } from 'widgets/GlobalBar.js';

class DebugView extends React.PureComponent {
    render() {
        return <React.Fragment>
            <GlobalBar />
            <Title title="Debug" />
            <Tabs>
                <RootLink className="no-underline">Home</RootLink>
                <InventoryLink className="no-underline">Feeds</InventoryLink>
                <LabelListLink className="no-underline">Labels</LabelListLink>
                <AddFeedLink className="no-underline">Add Feed</AddFeedLink>
            </Tabs>
            <div className="debug-icons">
                <h2>Icons</h2>
                <p>
                    Home <HomeIcon />
                    Label <LabelIcon />
                    Feed <FeedIcon />
                    Left <ArrowLeftIcon />
                    Right <ArrowRightIcon />
                    Outbound <OutboundIcon />
                    Edit <EditIcon />
                    Wide <WideIcon />
                    Narrow <NarrowIcon />
                    Ascending <AscDescIcon ascending={true} />
                    Descending <AscDescIcon ascending={false} />
                    Unread <ReadToggle read={false} articleId={1} onMarkArticlesRead={() => {}} />
                    Read <ReadToggle read={true} articleId={1} onMarkArticlesRead={() => {}} />
                    Clickable <ToggleWrap>
                        {(value, onToggle) => <ReadToggle read={value} onMarkArticlesRead={onToggle} articleId={1} />}
                    </ToggleWrap>
                    Unfave <FaveToggle fave={false} articleId={1} onMarkArticlesFave={() => {}} />
                    Fave <FaveToggle fave={true} articleId={1} onMarkArticlesFave={() => {}} />
                    Clickable <ToggleWrap>
                        {(value, onToggle) => <FaveToggle fave={value} onMarkArticlesFave={onToggle} articleId={1} />}
                    </ToggleWrap>
                </p>
                <p>
                    <HomeIcon className="icon debug-icon-grid" />
                    <LabelIcon className="icon debug-icon-grid" />
                    <FeedIcon className="icon debug-icon-grid" />
                    <ArrowLeftIcon className="icon debug-icon-grid" />
                    <ArrowRightIcon className="icon debug-icon-grid" />
                    <OutboundIcon className="icon debug-icon-grid" />
                    <EditIcon className="icon debug-icon-grid" />
                    <WideIcon className="icon debug-icon-grid" />
                    <NarrowIcon className="icon debug-icon-grid" />
                    <AscDescIcon ascending={true} className="icon debug-icon-grid" />
                    <AscDescIcon ascending={false} className="icon debug-icon-grid" />
                    <ToggleWrap>
                        {(value, onToggle) => <ReadToggle read={value} onMarkArticlesRead={onToggle} articleId={1} iconClass="icon debug-icon-grid" />}
                    </ToggleWrap>
                    <ToggleWrap>
                        {(value, onToggle) => <FaveToggle fave={value} onMarkArticlesFave={onToggle} articleId={1} iconClass="icon debug-icon-grid" />}
                    </ToggleWrap>
                </p>
            </div>
        </React.Fragment>;
    }
}

export const ConnectedDebugView = connect(state => state)(DebugView);


class ToggleWrap extends React.Component {
    constructor(props) {
        super(props);
        this.state = {value: false};
        this.handleToggle = () => {
            this.setState(state => {
                return {value: !state.value}
            });
        };
    }
    render() {
        return this.props.children(this.state.value, this.handleToggle);
    }
}
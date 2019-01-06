import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { Title } from 'widgets/Title.jsm';
import { Tabs } from 'widgets/Tabs.js';
import { GlobalBar, Header, HomeIconLink } from 'widgets/GlobalBar.js';

import { GlobeIcon, LabelIcon, FeedIcon, FollowIcon, OutboundIcon, EditIcon, GoFullscreenIcon, ExitFullscreenIcon, WideIcon, NarrowIcon, AscDescIcon, ReturnIcon, PrevIcon, NextIcon, SunIcon, MoonIcon } from 'widgets/icons.js';
import { FaveToggle, ReadToggle } from 'widgets/StateToggle.js';
import { RootLink, InventoryLink, LabelListLink, AddFeedLink } from 'widgets/links.js';
import './debug.less';

class DebugView extends React.PureComponent {
    render() {
        return <React.Fragment>
            <Title title="Debug" />
            <GlobalBar>
                <HomeIconLink />
                <Header>Debug</Header>
            </GlobalBar>
            <Tabs>
                <RootLink className="no-underline">Home</RootLink>
                <InventoryLink className="no-underline">Feeds</InventoryLink>
                <LabelListLink className="no-underline">Labels</LabelListLink>
                <AddFeedLink className="no-underline">Add Feed</AddFeedLink>
            </Tabs>
            <div className="debug-icons">
                <h2>Icons</h2>
                <p>
                    {/*Home <HomeIcon />*/}
                    GlobeIcon <GlobeIcon />
                    Label <LabelIcon />
                    Feed <FeedIcon />
                    Follow <FollowIcon />
                    Return <ReturnIcon />
                    Outbound <OutboundIcon />
                    Edit <EditIcon />
                    Wide <WideIcon />
                    GoFullscreen <GoFullscreenIcon />
                    ExitFullscreenIcon <ExitFullscreenIcon />
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
                    Next <NextIcon />
                    Prev <PrevIcon />
                </p>
                <p>
                    {/*<HomeIcon className="icon debug-icon-grid" />*/}
                    <SunIcon className="icon debug-icon-grid" />
                    <MoonIcon className="icon debug-icon-grid" />
                    <GlobeIcon className="icon debug-icon-grid" />
                    <LabelIcon className="icon debug-icon-grid" />
                    <FeedIcon className="icon debug-icon-grid" />
                    <FollowIcon className="icon debug-icon-grid" />
                    <ReturnIcon className="icon debug-icon-grid" />
                    <OutboundIcon className="icon debug-icon-grid" />
                    <EditIcon className="icon debug-icon-grid" />
                    <GoFullscreenIcon className="icon debug-icon-grid" />
                    <ExitFullscreenIcon className="icon debug-icon-grid" />
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
                    <NextIcon className="icon debug-icon-grid" />
                    <PrevIcon className="icon debug-icon-grid" />
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

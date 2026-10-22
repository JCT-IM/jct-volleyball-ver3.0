import React from 'react';
import { Header as UiHeader } from '@jct/ui';
import UpdateNotesModal from './UpdateNotesModal';

const Header: React.FC<React.ComponentProps<typeof UiHeader>> = (props) => (
    <UiHeader {...props} UpdateNotesModal={UpdateNotesModal} />
);

export default Header;

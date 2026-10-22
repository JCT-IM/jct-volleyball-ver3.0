import React from 'react';
import { TeamEmblem as UiTeamEmblem } from '@jct/ui';
import { useData } from '../contexts/DataContext';

type Props = Omit<React.ComponentProps<typeof UiTeamEmblem>, 'userEmblems'>;

const TeamEmblem: React.FC<Props> = (props) => {
    const { userEmblems } = useData();
    return <UiTeamEmblem {...props} userEmblems={userEmblems} />;
};

export default TeamEmblem;

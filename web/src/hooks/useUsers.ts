import { useCRUDList, type UseCRUDListResult } from './useCRUDList';
import type { User } from '../types/api';

export interface UseUsersOptions {
    onLoadError?: (error: Error) => void;
    onMutationError?: (error: Error) => void;
    revalidateOnFocus?: boolean;
}

export type UseUsersResult = UseCRUDListResult<User>;

export function useUsers(options: UseUsersOptions = {}): UseUsersResult {
    return useCRUDList<User>({
        endpoint: '/api/users',
        ...options,
    });
}

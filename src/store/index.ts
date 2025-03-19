import { configureStore } from '@reduxjs/toolkit';
import tablesReducer from './slices/tablesSlice';
import type { RootState } from './types';

// Configure the Redux store
const store = configureStore({
    reducer: {
        tables: tablesReducer,
        // Add other reducers here as needed
    },
    // Add middleware or other store enhancers here if needed
});

// Export the store
export default store;

// Export the RootState and AppDispatch types
export type { RootState };
export type AppDispatch = typeof store.dispatch; 
import localforage from 'localforage';
import { createDataService } from '@jct/storage';

localforage.config({
    name: 'J-IVE Volleyball',
    storeName: 'jive_volleyball_store',
    description: 'J-IVE 배구 프로젝트 데이터 저장소'
});

const service = createDataService('jive_', localforage);

export const STORAGE_KEYS = service.STORAGE_KEYS;
export const saveData = service.saveData;
export const loadData = service.loadData;
export const removeData = service.removeData;

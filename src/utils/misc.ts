import Gio from 'gi://Gio';
import { RESOURCE_PATH } from '../constants.js';

export function getIcon(extPath: string, str: string): Gio.Icon {
  return Gio.Icon.new_for_string(
    `resource:///${RESOURCE_PATH}icons/scalable/categories/${str}.svg`
  );
}

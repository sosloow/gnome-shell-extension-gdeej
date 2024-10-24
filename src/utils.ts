import Gio from 'gi://Gio';

export function getIcon(extPath: string, str: string): Gio.Icon {
  return Gio.Icon.new_for_string(`${extPath}/assets/images/${str}.svg`);
}

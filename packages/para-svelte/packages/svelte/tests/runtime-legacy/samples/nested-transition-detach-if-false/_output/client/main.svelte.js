import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Folder from './Folder.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let folder = $.prop($$props, 'folder', 12);

	var $$exports = {
		get folder() {
			return folder();
		},

		set folder($$value) {
			folder($$value);
			$.flush();
		}
	};

	$.bind_this(Folder($$anchor, { dir: 'a', $$legacy: true }), ($$value) => folder($$value), () => folder());

	return $.pop($$exports);
}
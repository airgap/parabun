import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from "svelte";

var root = $.from_html(`<input type="file"/> <button>Reset</button>`, 1);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let files = $.mutable_source();

	onMount(() => {
		let list = new DataTransfer();
		let file = new File(["content"], "filename.jpg");

		list.items.add(file);
		$.set(files, list.files);
	});

	$.init();

	var fragment = root();
	var input = $.first_child(fragment);
	var button = $.sibling(input, 2);

	$.bind_files(input, () => $.get(files), ($$value) => $.set(files, $$value));
	$.delegated('click', button, () => $.set(files, new DataTransfer().files));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);
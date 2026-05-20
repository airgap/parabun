import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import RawMustache from './RawMustache.svelte';

var root = $.from_html(`<button>Switch</button> <!> <p>This line should be last.</p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const content = $.mutable_source();
	let content1 = `<p>First line</p>`;
	let content2 = `<p>Another first line</p>`;
	let show = $.mutable_source(false);

	$.legacy_pre_effect(() => ($.get(show)), () => {
		$.set(content, $.get(show) ? content1 : content2);
	});

	$.legacy_pre_effect_reset();

	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	RawMustache(node, {
		get content() {
			return $.get(content);
		}
	});

	$.next(2);
	$.event('click', button, () => $.set(show, !$.get(show)));
	$.append($$anchor, fragment);
	$.pop();
}
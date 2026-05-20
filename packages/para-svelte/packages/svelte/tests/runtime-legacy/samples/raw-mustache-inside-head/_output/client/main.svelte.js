import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<!> <style>body { color: green; }</style>`, 1);
var root = $.from_html(`<button>Switch</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const content = $.mutable_source();
	let content1 = `<style>body { color: red; }</style>`;
	let content2 = `<style>body { color: blue; }</style>`;
	let show = $.mutable_source(false);

	$.legacy_pre_effect(() => ($.get(show)), () => {
		$.set(content, $.get(show) ? content1 : content2);
	});

	$.legacy_pre_effect_reset();

	var button = root();

	$.head('70s021', ($$anchor) => {
		var fragment = root_1();
		var node = $.first_child(fragment);

		$.html(node, () => $.get(content));
		$.next(2);
		$.append($$anchor, fragment);
	});

	$.event('click', button, () => $.set(show, !$.get(show)));
	$.append($$anchor, button);
	$.pop();
}
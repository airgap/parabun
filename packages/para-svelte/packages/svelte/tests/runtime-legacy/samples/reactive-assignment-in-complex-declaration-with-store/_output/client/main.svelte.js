import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<h1> </h1>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $eid = () => $.store_get($.get(eid), '$eid', $$stores);
	const $w = () => $.store_get($.get(w), '$w', $$stores);
	const $x = () => $.store_get($.get(x), '$x', $$stores);
	const $y = () => $.store_get($.get(y), '$y', $$stores);
	const $z = () => $.store_get($.get(z), '$z', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const z = $.mutable_source();
	let eid = $.mutable_source(writable(1));
	let foo = $.mutable_source();
	let u = $.mutable_source();
	let v = $.mutable_source();
	let w = $.mutable_source();
	let x = $.mutable_source();
	let y = $.mutable_source();

	(($$value) => {
		var $$array = $.to_array($$value, 3);

		$.set(u, $$array[0]);
		$.set(v, $$array[1]);
		$.store_unsub($.set(w, $$array[2]), '$w', $$stores);
	})([
		{
			id: $.store_unsub($.set(eid, writable($.set(foo, 2))), '$eid', $$stores),
			name: 'xxx'
		},
		5,
		writable(6)
	]);

	(($$value) => {
		$.store_unsub($.set(x, $$value.a), '$x', $$stores);
		$.store_unsub($.set(y, $$value.b), '$y', $$stores);
	})({ a: writable(9), b: writable(10) });

	function update() {
		(($$value) => {
			var $$array_1 = $.to_array($$value, 3);

			$.set(u, $$array_1[0]);
			$.set(v, $$array_1[1]);
			$.store_unsub($.set(w, $$array_1[2]), '$w', $$stores);
		})([
			{
				id: $.store_unsub($.set(eid, writable($.set(foo, 11))), '$eid', $$stores),
				name: 'yyy'
			},
			12,
			writable(13)
		]);

		(($$value) => {
			$.store_unsub($.set(x, $$value.a), '$x', $$stores);
			$.store_unsub($.set(y, $$value.b), '$y', $$stores);
		})({ a: writable(14), b: writable(15) });
	}

	$.legacy_pre_effect(() => ($.get(u)), () => {
		$.store_unsub($.set(z, $.get(u).id), '$z', $$stores);
	});

	$.legacy_pre_effect_reset();

	var $$exports = { update };

	$.init();

	var h1 = root();
	var text = $.child(h1);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, `${$.get(foo) ?? ''} ${$eid() ?? ''} ${($.get(u), $.untrack(() => $.get(u).name)) ?? ''} ${$.get(v) ?? ''} ${$w() ?? ''} ${$x() ?? ''} ${$y() ?? ''} ${$z() ?? ''}`));
	$.append($$anchor, h1);
	$.bind_prop($$props, 'update', update);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}
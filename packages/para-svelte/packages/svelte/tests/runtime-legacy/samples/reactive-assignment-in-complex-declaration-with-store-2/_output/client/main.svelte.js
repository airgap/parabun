import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<h1> </h1>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $u = () => $.store_get(u, '$u', $$stores);
	const $v = () => $.store_get(v, '$v', $$stores);
	const $w = () => $.store_get(w, '$w', $$stores);
	const $x = () => $.store_get(x, '$x', $$stores);
	const $y = () => $.store_get(y, '$y', $$stores);
	const $eid = () => $.store_get($.get(eid), '$eid', $$stores);
	const $z = () => $.store_get($.get(z), '$z', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const z = $.mutable_source();
	let eid = $.mutable_source(writable(1));
	let foo = $.mutable_source();
	const u = writable(2);
	const v = writable(3);
	const w = writable(4);
	const x = writable(5);
	const y = writable(6);

	(($$value) => {
		var $$array = $.to_array($$value, 3);

		$.store_set(u, $$array[0]);
		$.store_set(v, $$array[1]);
		$.store_set(w, $$array[2]);
	})([
		{
			id: $.store_unsub($.set(eid, writable($.set(foo, 2))), '$eid', $$stores),
			name: 'xxx'
		},
		5,
		6
	]);

	(($$value) => {
		$.store_set(x, $$value.a);
		$.store_set(y, $$value.b);
	})({ a: 9, b: 10 });

	function update() {
		(($$value) => {
			var $$array_1 = $.to_array($$value, 3);

			$.store_set(u, $$array_1[0]);
			$.store_set(v, $$array_1[1]);
			$.store_set(w, $$array_1[2]);
		})([
			{
				id: $.store_unsub($.set(eid, writable($.set(foo, 11))), '$eid', $$stores),
				name: 'yyy'
			},
			12,
			13
		]);

		(($$value) => {
			$.store_set(x, $$value.a);
			$.store_set(y, $$value.b);
		})({ a: 14, b: 15 });
	}

	$.legacy_pre_effect(() => ($u()), () => {
		$.store_unsub($.set(z, $u().id), '$z', $$stores);
	});

	$.legacy_pre_effect_reset();

	var $$exports = { update };

	$.init();

	var h1 = root();
	var text = $.child(h1);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, `${$.get(foo) ?? ''} ${$eid() ?? ''} ${($u(), $.untrack(() => $u().name)) ?? ''} ${$v() ?? ''} ${$w() ?? ''} ${$x() ?? ''} ${$y() ?? ''} ${$z() ?? ''}`));
	$.append($$anchor, h1);
	$.bind_prop($$props, 'update', update);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}
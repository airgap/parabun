import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import A from './A.svelte';
import { writable } from 'svelte/store';

var root = $.from_html(`<!> <br/> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let i = $.mutable_source('i');
	let k = $.mutable_source(writable('k'));
	let l = $.mutable_source('l');
	let n = $.mutable_source(writable('n'));
	let a = $.mutable_source('a');
	let c = $.mutable_source(writable('c'));
	let d = $.mutable_source('d');
	let f = $.mutable_source(writable('f'));

	function update() {
		$.set(i, 'ii');
		$.set(k, writable('kk'));
		$.set(l, 'll');
		$.set(n, writable('nn'));
		$.set(a, 'aa');
		$.set(c, writable('cc'));
		$.set(d, 'dd');
		$.set(f, writable('ff'));
	}

	var $$exports = { update };

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	A(node, {});

	var node_1 = $.sibling(node, 4);

	A(node_1, {
		get i() {
			return $.get(i);
		},

		get k() {
			return $.get(k);
		},

		get l() {
			return $.get(l);
		},

		get n() {
			return $.get(n);
		},

		get a() {
			return $.get(a);
		},

		get c() {
			return $.get(c);
		},

		get d() {
			return $.get(d);
		},

		get f() {
			return $.get(f);
		}
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'update', update);

	return $.pop($$exports);
}